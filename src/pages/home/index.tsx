import {ScrollView, Text, View} from '@tarojs/components'
import {TabBar} from 'antd-mobile';
import {AppOutline, UserOutline} from 'antd-mobile-icons'
import './index.scss'


export default function Index() {

  return (
    <View className='homeContainer'>
      <ScrollView className='scroll' scrollY>
        <View className='appName'>
          <Text>MTGG4</Text>
        </View>
        <View className='userInfo'>
          <Text>用户昵称3</Text>
        </View>
        <View className='moduleBox'></View>
        <View className='bottomBox'></View>
      </ScrollView>
      <TabBar className='tabBar' activeKey='home'>
        <TabBar.Item key='home' icon={<AppOutline />} />
        {/*<TabBar.Item key="message" icon={<MessageOutline/>}/>*/}
        <TabBar.Item key='user' icon={<UserOutline />} />
      </TabBar>
    </View>
  )
}

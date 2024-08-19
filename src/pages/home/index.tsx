import {View, Text, ScrollView} from '@tarojs/components'
import './index.scss'
import {Avatar, TabBar} from "antd-mobile";
import {AppOutline, MessageOutline, UserOutline} from 'antd-mobile-icons'


export default function Index() {

  return (
    <View className='homeContainer'>
      <ScrollView className={'scroll'} scrollY>
        <View className={'appName'}>
          <Text>{'MTGG'}</Text>
        </View>
        <View className={'userInfo'}>
          <Avatar className={'userAvatar'} size={'large'} src={'https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVXCYX.png'}/>
          <Text>{'用户昵称'}</Text>
        </View>
        <View className={'moduleBox'}></View>
        <View className={'bottomBox'}></View>
      </ScrollView>
      <TabBar className={'tabBar'} activeKey={'home'}>
        <TabBar.Item key="home" icon={<AppOutline/>}/>
        {/*<TabBar.Item key="message" icon={<MessageOutline/>}/>*/}
        <TabBar.Item key="user" icon={<UserOutline/>}/>
      </TabBar>
    </View>
  )
}
